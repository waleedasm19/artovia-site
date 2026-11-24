import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, AppState, BackHandler, Image, ImageBackground, Linking,
  Platform, Pressable, RefreshControl, ScrollView, Share, Text, TextInput, View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Feather from '@expo/vector-icons/Feather';
import {
  SITE_URL, fetchArticle, fetchFields, fetchLibrary, fetchMagazine, fetchNews,
} from './data.mjs';
import { color, s } from './styles';

const orbit = require('./assets/orbit.jpg');
const emblem = require('./assets/emblem.png');
const tabs = [
  { id: 'home', title: 'استكشف', icon: 'compass' },
  { id: 'library', title: 'المكتبة', icon: 'book-open' },
  { id: 'news', title: 'الأخبار', icon: 'activity' },
  { id: 'magazine', title: 'مجلة المدار', icon: 'layers' },
];
const loaders = { library: fetchLibrary, news: fetchNews, fields: fetchFields, magazine: fetchMagazine };
const appTitle = 'مؤسسة إرتوفيا الخيرية';
const appLink = `${SITE_URL}app.html`;
const updateMs = 60_000;

function usePublicContent() {
  const [content, setContent] = useState({});
  const [issues, setIssues] = useState([]);
  const [pending, setPending] = useState(true);
  const [revision, setRevision] = useState(0);
  const running = useRef(null);

  const refresh = useCallback(async (visible = false) => {
    if (running.current) {
      if (visible) setPending(true);
      return;
    }
    const controller = new AbortController();
    running.current = controller;
    if (visible) setPending(true);
    const timeout = setTimeout(() => controller.abort(), 14_000);
    const requests = Object.entries(loaders);
    const results = await Promise.allSettled(requests.map(([, load]) => load({ signal: controller.signal })));
    clearTimeout(timeout);
    if (running.current !== controller) return;
    running.current = null;
    const updated = {};
    const failed = [];
    results.forEach((result, index) => {
      const name = requests[index][0];
      if (result.status === 'fulfilled') updated[name] = result.value;
      else failed.push(name);
    });
    setContent((last) => ({ ...last, ...updated }));
    setIssues(failed);
    setPending(false);
    setRevision((value) => value + 1);
  }, []);

  useEffect(() => {
    refresh(true);
    let active = AppState.currentState !== 'background';
    const state = AppState.addEventListener('change', (next) => {
      const wasActive = active;
      active = next === 'active';
      if (active && !wasActive) refresh();
    });
    const timer = setInterval(() => { if (active) refresh(); }, updateMs);
    return () => {
      state.remove();
      clearInterval(timer);
      running.current?.abort();
      running.current = null;
    };
  }, [refresh]);

  return { content, issues, pending, revision, refresh };
}

function useArticle(slug, revision) {
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!slug) return undefined;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 14_000);
    let current = true;
    fetchArticle(slug, { signal: controller.signal }).then((article) => {
      if (!current) return;
      setResult(article);
      setError('');
    }).catch(() => { if (current) setError(slug); }).finally(() => clearTimeout(timeout));
    return () => {
      current = false;
      clearTimeout(timeout);
      controller.abort();
    };
  }, [slug, revision]);
  return { article: result?.slug === slug ? result : null, failed: error === slug };
}

async function openUrl(url) {
  try { await Linking.openURL(url); }
  catch { Alert.alert('تعذّر فتح الرابط', 'تحقّق من الاتصال وحاول مرة أخرى.'); }
}

async function shareUrl(url, title) {
  try {
    if (Platform.OS === 'web') {
      if (navigator.share) { await navigator.share({ title, url }); return; }
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        globalThis.alert('تم نسخ الرابط.');
        return;
      }
      globalThis.prompt('انسخ الرابط للمشاركة', url);
      return;
    }
    const data = Platform.OS === 'ios' ? { title, message: title, url } : { title, message: `${title}\n${url}` };
    await Share.share(data);
  } catch (error) {
    if (error?.name !== 'AbortError') Alert.alert('تعذّرت المشاركة', 'حاول مرة أخرى.');
  }
}

function formatDate(value) {
  if (!value) return '';
  const date = new Date(value.length === 10 ? `${value}T12:00:00Z` : value);
  return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat('ar-SA-u-ca-gregory', {
    year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC',
  }).format(date);
}

function matchText(query, ...fields) {
  const normalize = (value) => (value || '').toLowerCase().replace(/[ً-ٟـ]/g, '').replace(/[أإآٱ]/g, 'ا');
  return fields.map(normalize).join(' ').includes(normalize(query.trim()));
}

function Icon({ name, size = 21, tint = color.text }) {
  return <Feather name={name} size={size} color={tint} />;
}

function Button({ children, onPress, icon, primary = false }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [
    s.button, primary && s.buttonPrimary, pressed && s.pressed,
  ]}>
    {icon && <Icon name={icon} size={17} tint={primary ? color.ink : color.text} />}
    <Text style={[s.buttonLabel, primary && s.buttonLabelPrimary]}>{children}</Text>
  </Pressable>;
}

function IconButton({ icon, label, onPress }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}
    style={({ pressed }) => [s.iconButton, pressed && s.pressed]}><Icon name={icon} /></Pressable>;
}

function Navigation({ current, onTab, wide }) {
  return <View accessibilityRole="tablist" style={wide ? s.rail : s.tabBar}>
    {tabs.map((tab) => {
      const active = tab.id === current;
      return <Pressable key={tab.id} accessibilityRole="tab" accessibilityState={{ selected: active }}
        onPress={() => onTab(tab.id)} style={({ pressed }) => [
          wide ? s.railTab : s.tab, active && s.activeTab, pressed && s.pressed,
        ]}>
        <Icon name={tab.icon} size={21} tint={active ? color.accent : color.muted} />
        <Text style={[s.tabLabel, active && s.accent]}>{tab.title}</Text>
      </Pressable>;
    })}
  </View>;
}

function SectionTitle({ title, label, action }) {
  return <View style={s.sectionTitle}>
    <Text accessibilityRole="header" style={s.sectionText}>{title}</Text>
    {action && <Pressable accessibilityRole="button" style={s.inlineAction} onPress={action}>
      <Text style={s.inlineLabel}>{label || 'عرض الكل'}</Text>
    </Pressable>}
  </View>;
}

function Cover({ uri, style, icon = 'image', alt }) {
  const [error, setError] = useState('');
  if (uri && error !== uri) return <Image source={{ uri }} accessibilityLabel={alt || undefined}
    resizeMode="cover" onError={() => setError(uri)} style={[s.coverBase, style]} />;
  return <View style={[s.coverBase, s.coverBlank, style]}><Icon name={icon} size={27} tint={color.muted} /></View>;
}

function ContentCard({ item, kind, onOpen, fieldName }) {
  const article = kind === 'article';
  const book = kind === 'book';
  const meta = book ? (fieldName || item.type) : article ? (fieldName || item.source) : `العدد ${item.issue}`;
  const summary = book ? item.subtitle : item.summary;
  return <Pressable accessibilityRole="button" accessibilityLabel={item.title} onPress={() => onOpen(kind, item)}
    style={({ pressed }) => [s.card, book && s.bookCard, pressed && s.pressed]}>
    <Cover uri={item.cover} icon={book ? 'book-open' : 'file-text'} style={book ? s.bookThumb : s.storyThumb} />
    <View style={s.cardBody}>
      {!!meta && <Text numberOfLines={1} style={s.cardMeta}>{meta}</Text>}
      <Text style={s.cardTitle} numberOfLines={3}>{item.title}</Text>
      {!!summary && <Text style={s.cardDescription} numberOfLines={2}>{summary}</Text>}
      {!book && !!item.date && <Text style={s.cardDate}>{formatDate(item.date)}</Text>}
    </View>
  </Pressable>;
}

function Grid({ items, kind, onOpen, fields, columns }) {
  return <View style={s.grid}>{items.map((item) => <View key={item.id}
    style={columns > 1 ? s.gridHalf : s.gridFull}>
    <ContentCard item={item} kind={kind} onOpen={onOpen} fieldName={fields[item.field]} />
  </View>)}</View>;
}

function Search({ value, onChange, label }) {
  return <View style={s.search}>
    <Icon name="search" size={19} tint={color.muted} />
    <TextInput accessibilityLabel={label} value={value} onChangeText={onChange} style={s.searchInput}
      placeholder={label} placeholderTextColor={color.muted} returnKeyType="search" autoCorrect={false} />
    {!!value && <IconButton icon="x" label="مسح البحث" onPress={() => onChange('')} />}
  </View>;
}

function StateMessage({ text, onPress, action }) {
  return <View style={s.message}>
    <Text accessibilityLiveRegion="polite" style={s.description}>{text}</Text>
    {action && <Button onPress={onPress}>{action}</Button>}
  </View>;
}

function Details({ selected, result, fields, refresh }) {
  const { type, item } = selected;
  const article = result.article;
  const full = type === 'article' ? (article || item) : item;
  return <View style={s.detail}>
    {type === 'book' ? <View style={s.detailBook}>
      <Cover uri={full.cover} style={s.detailBookCover} icon="book-open" />
      <View style={s.detailBookHeading}>
        <Text style={s.cardMeta}>{fields[full.field] || full.type || 'المكتبة'}</Text>
        <Text accessibilityRole="header" style={s.detailTitle}>{full.title}</Text>
        {!!full.subtitle && <Text style={s.description}>{full.subtitle}</Text>}
      </View>
    </View> : <>
      {!!full.cover && <Cover uri={full.cover} alt={full.coverAlt} style={s.detailCover} />}
      {!!article?.credit && <Text style={s.cardDate}
        onPress={article.creditUrl ? () => openUrl(article.creditUrl) : undefined}>{article.credit}</Text>}
      <Text style={s.cardMeta}>{type === 'issue' ? `مجلة المدار · العدد ${full.issue}` : fields[full.field] || full.source}</Text>
      <Text accessibilityRole="header" style={s.detailTitle}>{full.title}</Text>
      {!!full.date && <Text style={s.cardDate}>{formatDate(full.date)}</Text>}
    </>}
    <View style={s.actions}>
      {type !== 'article' && <Button primary icon={type === 'book' ? 'book-open' : 'external-link'}
        onPress={() => openUrl(full.url)}>{type === 'book' ? 'صفحة الكتاب' : 'قراءة العدد'}</Button>}
      <Button icon="share-2" onPress={() => shareUrl(full.url, full.title)}>مشاركة</Button>
    </View>
    {!!(full.deck || full.blurb || full.summary) && <Text style={s.description}>{full.deck || full.blurb || full.summary}</Text>}
    {type === 'article' && !article && (result.failed
      ? <StateMessage text="تعذّر تحميل نص المقال." action="إعادة المحاولة" onPress={() => refresh(false)} />
      : <ActivityIndicator color={color.accent} accessibilityLabel="تحميل المقال" />)}
    {article?.body.map((block, index) => <View key={index} style={block.type === 'quote' && s.quote}>
      <Text style={block.type === 'heading' ? s.sectionText : s.reading}>{block.text}</Text>
      {!!block.by && <Text style={s.cardDate}>{block.by}</Text>}
    </View>)}
    {Boolean(article?.facts.length) && <View style={s.note}>
      <Text accessibilityRole="header" style={s.sectionText}>أبرز الحقائق</Text>
      {article.facts.map((fact, index) => <Text key={index} style={s.reading}>• {fact}</Text>)}
    </View>}
    {type === 'book' && Boolean(full.contents.length) && <View style={s.note}>
      <Text accessibilityRole="header" style={s.sectionText}>المحتويات</Text>
      {full.contents.map((entry, index) => <View key={index}>
        <Text style={entry.part ? s.cardMeta : s.reading}>{entry.part || entry.title}</Text>
        {!!entry.note && <Text style={s.description}>{entry.note}</Text>}
      </View>)}
    </View>}
    {type === 'issue' && Boolean(full.highlights.length) && <View style={s.note}>
      <Text accessibilityRole="header" style={s.sectionText}>في هذا العدد</Text>
      {full.highlights.map((highlight, index) => <Text key={index} style={s.reading}>• {highlight}</Text>)}
    </View>}
    {article && <View style={s.actions}>
      {article.sourceUrl && <Button icon="external-link" onPress={() => openUrl(article.sourceUrl)}>المصدر الأصلي</Button>}
      <Button onPress={() => openUrl(article.url)}>المقال على الموقع</Button>
      {article.license && article.licenseUrl && <Button onPress={() => openUrl(article.licenseUrl)}>{article.license}</Button>}
    </View>}
  </View>;
}

function Artovia() {
  const { width } = useWindowDimensions();
  const wide = width >= 850;
  const columns = width >= 610 ? 2 : 1;
  const [tab, setTab] = useState('home');
  const [selected, setSelected] = useState(null);
  const [query, setQuery] = useState('');
  const [field, setField] = useState('');
  const [limit, setLimit] = useState(16);
  const scroll = useRef(null);
  const { content, issues, pending, revision, refresh } = usePublicContent();
  const result = useArticle(selected?.type === 'article' ? selected.item.slug : null, revision);
  const fields = useMemo(() => Object.fromEntries((content.fields || []).map((entry) => [entry.id, entry.name])), [content.fields]);
  const library = content.library || [];
  const news = content.news?.items || [];
  const magazine = content.magazine || [];
  const activeTab = tabs.find((item) => item.id === tab);
  const openItem = (type, item) => setSelected({ type, item });
  const changeTab = useCallback((id) => {
    setTab(id);
    setSelected(null);
    setQuery('');
    setField('');
    setLimit(16);
    if (id === tab) scroll.current?.scrollTo({ y: 0, animated: true });
  }, [tab]);

  useEffect(() => {
    const back = BackHandler.addEventListener('hardwareBackPress', () => {
      if (selected) { setSelected(null); return true; }
      if (tab !== 'home') { changeTab('home'); return true; }
      return false;
    });
    return () => back.remove();
  }, [selected, tab, changeTab]);

  const collection = tab === 'library' ? library : tab === 'news' ? news : magazine;
  const displayed = collection.filter((item) => (!field || item.field === field)
    && matchText(query, item.title, item.subtitle, item.en, item.source, fields[item.field]));
  const filteredFields = Object.entries(fields).filter(([id]) => news.some((item) => item.field === id));
  const showIssue = tab === 'home' ? issues.some((item) => item !== 'fields') : issues.includes(tab);
  const currentSelection = selected && {
    ...selected,
    item: (selected.type === 'book' ? library : selected.type === 'issue' ? magazine : news)
      .find((item) => item.id === selected.item.id) || selected.item,
  };

  return <SafeAreaView style={s.safe}>
    <StatusBar style="light" />
    <View style={s.header}>
      <View style={s.brand}>
        {selected ? <IconButton icon="chevron-right" label="رجوع" onPress={() => setSelected(null)} />
          : <Image source={emblem} style={s.emblem} />}
        <View style={s.brandCopy}>
          <Text style={s.brandName} numberOfLines={1}>{selected ? activeTab.title : 'إرتوفيا'}</Text>
          {!selected && <Text style={s.brandDescription} numberOfLines={1}>مؤسسة خيرية للعلم والمعرفة</Text>}
        </View>
      </View>
      <View style={s.headerTools}>
        {Platform.OS === 'web' && <IconButton icon="refresh-cw" label="تحديث المحتوى" onPress={() => refresh(true)} />}
        <IconButton icon="share-2" label="مشاركة التطبيق" onPress={() => shareUrl(appLink, appTitle)} />
      </View>
    </View>
    <View style={s.main}>
      <ScrollView key={`${tab}/${selected?.item.id || ''}`} ref={scroll} style={s.scroll}
        contentContainerStyle={[s.page, wide && s.pageWide]} keyboardShouldPersistTaps="handled"
        refreshControl={Platform.OS !== 'web' ? <RefreshControl refreshing={pending} onRefresh={() => refresh(true)}
          tintColor={color.accent} colors={[color.ink]} progressBackgroundColor={color.accent} /> : undefined}>
        {currentSelection ? <Details selected={currentSelection} result={result} refresh={refresh} fields={fields} />
          : <>
            {showIssue && <StateMessage text="تعذّر تحديث بعض المحتوى. تحقّق من الاتصال." action="إعادة المحاولة"
              onPress={() => refresh(true)} />}
            {tab === 'home' ? <>
              <ImageBackground source={orbit} resizeMode="cover" imageStyle={s.heroImage}
                style={[s.hero, wide && s.heroWide]}>
                <View style={[s.heroCopy, wide && s.heroCopyWide]}>
                  <Text accessibilityRole="header" style={[s.heroTitle, wide && s.heroTitleWide]}>المعرفة{`\n`}<Text style={s.accent}>بلغتنا</Text></Text>
                  <Text style={s.heroSubtitle}>كتب عربية مجانية وأخبار من عالم العلم والتقنية.</Text>
                  <Button primary icon="compass" onPress={() => changeTab('library')}>تصفّح المكتبة</Button>
                </View>
              </ImageBackground>
              <SectionTitle title="آخر الأخبار العلمية" action={() => changeTab('news')} />
              <Grid items={news.slice(0, columns === 2 ? 4 : 3)} kind="article" onOpen={openItem} fields={fields} columns={columns} />
              <SectionTitle title="من مكتبة إرتوفيا" action={() => changeTab('library')} />
              <Grid items={library.slice(0, 4)} kind="book" onOpen={openItem} fields={fields} columns={columns} />
              {!!magazine.length && <>
                <SectionTitle title="مجلة المدار" action={() => changeTab('magazine')} />
                <Grid items={magazine.slice(0, 2)} kind="issue" onOpen={openItem} fields={fields} columns={columns} />
              </>}
              <View style={s.siteLinks}>
                <Button icon="globe" onPress={() => openUrl(SITE_URL)}>موقع المؤسسة</Button>
                <Button icon="user" onPress={() => openUrl(`${SITE_URL}account.html`)}>حساب المؤسسة</Button>
              </View>
            </> : <>
              <View style={s.titleBlock}>
                <Icon name={activeTab.icon} size={26} tint={color.accent} />
                <Text accessibilityRole="header" style={s.pageTitle}>{tab === 'news' ? 'الأخبار العلمية' : activeTab.title}</Text>
              </View>
              {tab !== 'magazine' && <Search value={query} onChange={(value) => { setQuery(value); setLimit(16); }}
                label={tab === 'library' ? 'ابحث عن كتاب' : 'ابحث في الأخبار'} />}
              {tab === 'news' && Boolean(filteredFields.length) && <View style={s.filters}>
                {[['', 'الكل'], ...filteredFields].map(([id, name]) => <Pressable key={id} accessibilityRole="button"
                  accessibilityState={{ selected: field === id }} disabled={field === id} onPress={() => { setField(id); setLimit(16); }}
                  style={[s.filter, field === id && s.filterActive]}>
                  <Text style={[s.tabLabel, field === id && s.accent]}>{name}</Text>
                </Pressable>)}
              </View>}
              {!pending && !showIssue && !displayed.length && <StateMessage text={query ? 'لا توجد نتائج مطابقة.' : 'لا توجد مواد في هذا القسم حاليًا.'} />}
              <Grid items={displayed.slice(0, limit)} kind={tab === 'library' ? 'book' : tab === 'news' ? 'article' : 'issue'}
                onOpen={openItem} fields={fields} columns={columns} />
              {displayed.length > limit && <View style={s.actions}><Button onPress={() => setLimit((last) => last + 16)}>المزيد</Button></View>}
            </>}
            {pending && !content.library && !content.news && <ActivityIndicator color={color.accent} accessibilityLabel="تحميل المحتوى" />}
          </>}
      </ScrollView>
      {wide && <Navigation current={tab} onTab={changeTab} wide />}
    </View>
    {!wide && <Navigation current={tab} onTab={changeTab} />}
  </SafeAreaView>;
}

export default function App() {
  return <SafeAreaProvider><Artovia /></SafeAreaProvider>;
}
