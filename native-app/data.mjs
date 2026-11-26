export const SITE_URL = 'https://artovia.center/';

const string = (value) => typeof value === 'string' ? value : '';
const strings = (value) => Array.isArray(value) ? value.filter((item) => typeof item === 'string') : [];
const records = (value) => Array.isArray(value) ? value.filter((item) => item && typeof item === 'object') : [];
const validSlug = (value) => typeof value === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(value);
const colorCode = (value) => /^#[\da-f]{6}$/i.test(value) ? value : '';

function httpsUrl(value) {
  const url = string(value).trim();
  return /^https:\/\/[a-z0-9.-]+(?::[0-9]+)?(?:[/?#][^\s\\]*)?$/i.test(url) ? url : '';
}

function assetUrl(value) {
  const path = string(value).trim();
  if (!path) return '';
  const external = httpsUrl(path);
  if (external) return external;
  if (/^[a-z][a-z0-9+.-]*:|^\/|[\\\u0000-\u001f]|%2f|%5c/i.test(path)) return '';
  if (/(?:^|\/)(?:\.|%2e){2}(?=\/|[?#]|$)/i.test(path)) return '';
  return SITE_URL + path.replace(/^\.\//, '').replace(/ /g, '%20');
}

const itemUrl = (page, id) => `${SITE_URL}${page}.html?id=${encodeURIComponent(id)}`;

async function fetchData(path, { signal } = {}) {
  const url = `${SITE_URL}data/${path}.json`;
  const cacheOptions = typeof globalThis.document === 'undefined'
    ? { headers: { 'Cache-Control': 'no-cache' } }
    : { cache: 'no-cache' };
  const response = await fetch(url, { ...cacheOptions, signal });
  if (!response.ok) {
    throw new Error(`Could not load ${path} (${response.status})`);
  }
  return response.json();
}

function expectList(value, name) {
  if (!Array.isArray(value)) throw new Error(`Invalid ${name} data`);
  return records(value);
}

export async function fetchFields(options) {
  const data = await fetchData('fields', options);
  return expectList(data, 'fields').filter((field) => string(field.id) && string(field.name)).map((field) => ({
    id: field.id,
    name: field.name,
    en: string(field.en),
    color: colorCode(field.color),
  }));
}

export async function fetchLibrary(options) {
  const data = await fetchData('books', options);
  return expectList(data, 'books').filter((book) => string(book.id) && string(book.title)).map((book) => ({
    id: book.id,
    title: book.title,
    subtitle: string(book.subtitle),
    en: string(book.en),
    cover: assetUrl(book.cover),
    status: string(book.status),
    progress: Number.isFinite(book.progress) ? Math.max(0, Math.min(100, book.progress)) : 0,
    field: string(book.field),
    type: string(book.type),
    blurb: string(book.blurb),
    review: book.review === true,
    hasDownload: Boolean(string(book.pdf)) && book.review !== true,
    url: itemUrl('book', book.id),
    sampleUrl: assetUrl(book.sample),
    edition: string(book.edition),
    pages: string(book.pages),
    level: string(book.level),
    format: string(book.format),
    features: strings(book.features),
    contents: records(book.contents).filter((entry) => string(entry.part) || string(entry.t)).map((entry) => ({
      part: string(entry.part),
      title: string(entry.t),
      note: string(entry.note),
    })),
  }));
}

export async function fetchNews(options) {
  const data = await fetchData('news', options);
  return {
    updated: string(data?.updated),
    items: expectList(data?.items, 'news').filter((item) => validSlug(item.slug) && string(item.title)).map((item) => ({
      id: item.slug,
      slug: item.slug,
      field: string(item.field),
      title: item.title,
      summary: string(item.summary),
      cover: assetUrl(item.cover),
      date: string(item.date),
      source: string(item.source),
      url: itemUrl('article', item.slug),
      sourceUrl: httpsUrl(item.url),
    })),
  };
}

function articleBody(value) {
  return (Array.isArray(value) ? value : []).flatMap((block) => {
    if (typeof block === 'string') return [{ type: 'paragraph', text: block }];
    if (string(block?.h)) return [{ type: 'heading', text: block.h }];
    if (string(block?.q)) return [{ type: 'quote', text: block.q, by: string(block.by), en: string(block.en) }];
    return [];
  });
}

export async function fetchArticle(slug, options) {
  if (!validSlug(slug)) throw new Error('Invalid article identifier');
  const data = await fetchData(`articles/${slug}`, options);
  if (!string(data?.title)) throw new Error('Invalid article data');
  return {
    id: slug,
    slug,
    field: string(data.field),
    title: data.title,
    deck: string(data.deck),
    date: string(data.date),
    cover: assetUrl(data.cover),
    coverAlt: string(data.coverAlt),
    credit: string(data.credit),
    creditUrl: httpsUrl(data.creditUrl),
    source: string(data.source),
    sourceUrl: httpsUrl(data.url),
    study: string(data.study),
    license: string(data.license),
    licenseUrl: httpsUrl(data.licenseUrl),
    readMin: string(data.readMin),
    body: articleBody(data.body),
    facts: strings(data.facts),
    url: itemUrl('article', slug),
  };
}

export async function fetchMagazine(options) {
  const data = await fetchData('magazine', options);
  return expectList(data, 'magazine').filter((issue) => Number.isInteger(issue.issue) && string(issue.title)).map((issue) => ({
    id: String(issue.issue),
    issue: issue.issue,
    title: issue.title,
    summary: string(issue.summary),
    cover: assetUrl(issue.cover),
    date: string(issue.date),
    hijri: string(issue.hijri),
    pages: Number.isInteger(issue.pages) ? issue.pages : null,
    highlights: strings(issue.highlights),
    url: `${SITE_URL}magazine.html`,
  })).sort((first, second) => second.date.localeCompare(first.date));
}

export async function fetchWorld(options) {
  const data = await fetchData('world', options);
  const themes = Object.entries(data?.themes ?? {}).filter(([, theme]) => string(theme?.name)).map(([id, theme]) => ({
    id,
    name: theme.name,
    color: colorCode(theme.color),
  }));
  const items = expectList(data?.items, 'world articles')
    .filter((item) => validSlug(item.slug) && string(item.title) && string(item.cover))
    .map((item) => ({
      id: item.slug,
      slug: item.slug,
      theme: string(item.theme),
      title: item.title,
      originalTitle: string(item.origTitle),
      summary: string(item.deck),
      cover: assetUrl(item.cover),
      author: string(item.author),
      authorAr: string(item.authorAr),
      authorPhoto: assetUrl(item.photo),
      source: string(item.source),
      year: string(item.year),
      mode: string(item.mode),
      date: string(item.added),
      url: itemUrl('essay', item.slug),
    }));
  return { updated: string(data?.updated), themes, items };
}

export async function fetchWorldEssay(slug, options) {
  if (!validSlug(slug)) throw new Error('Invalid essay identifier');
  const data = await fetchData(`world/${slug}`, options);
  if (!string(data?.title)) throw new Error('Invalid essay data');
  return {
    id: slug,
    slug,
    theme: string(data.theme),
    title: data.title,
    originalTitle: string(data.origTitle),
    deck: string(data.deck),
    cover: assetUrl(data.cover),
    coverAlt: string(data.coverAlt),
    credit: string(data.credit),
    creditUrl: httpsUrl(data.creditUrl),
    author: {
      name: string(data.author?.name),
      nameAr: string(data.author?.nameAr),
      bio: string(data.author?.bio),
      photo: assetUrl(data.author?.photo),
      photoCredit: string(data.author?.photoCredit),
      photoUrl: httpsUrl(data.author?.photoUrl),
    },
    source: string(data.source),
    sourceUrl: httpsUrl(data.url),
    license: string(data.license),
    pubDate: string(data.pubDate),
    date: string(data.added),
    readMin: string(data.readMin),
    mode: string(data.mode),
    body: articleBody(data.body),
    ideas: strings(data.ideas),
    critique: strings(data.critique),
    think: strings(data.think),
    url: itemUrl('essay', slug),
  };
}

export async function fetchKnowledge(options) {
  const [showcase, archive] = await Promise.all([fetchData('showcase', options), fetchData('knowledge', options)]);
  const updated = string(showcase?.updated);
  const current = expectList(showcase?.scenes, 'showcase');
  const older = expectList(archive?.items, 'knowledge');
  const items = [...current, ...older].flatMap((item, index) => {
    if (!string(item.text)) return [];
    return [{
      id: `${index < current.length ? 'current' : 'archive'}-${index}`,
      title: string(item.title),
      text: item.text,
      cite: string(item.cite),
      cover: assetUrl(item.img),
      credit: string(item.credit),
      date: index < current.length ? updated : string(item.shown),
      url: `${SITE_URL}knowledge.html`,
    }];
  });
  return { updated, items };
}
