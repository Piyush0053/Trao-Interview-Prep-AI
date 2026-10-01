const { fetch } = require('undici');
const cheerio = require('cheerio');
const robotsParser = require('robots-parser');
const { URL } = require('url');
const { callLLM } = require('./llm');

const ALLOW_LOCAL_HOSTS = process.env.ALLOW_LOCAL_HOSTS === 'true';
const MAX_PAYLOAD_SIZE = 2 * 1024 * 1024; // 2MB

// SSRF Guard
function validateUrl(urlStr) {
  try {
    const parsed = new URL(urlStr);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }
    const isLocal = /^(localhost|127\.0\.0\.1|169\.254\.|10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(parsed.hostname);
    if (isLocal && !ALLOW_LOCAL_HOSTS) {
      return false;
    }
    return true;
  } catch(e) {
    return false;
  }
}

async function fetchWithLimit(url, timeout = 8000) {
  const res = await fetch(url, { method: 'GET', signal: AbortSignal.timeout(timeout) });
  
  if (!res.ok) {
    return { ok: false, status: res.status, headers: res.headers };
  }

  const contentLength = res.headers.get('content-length');
  if (contentLength && parseInt(contentLength, 10) > MAX_PAYLOAD_SIZE) {
    return { ok: false, reason: 'Payload too large (Content-Length)' };
  }

  const arrayBuffer = await res.arrayBuffer();
  if (arrayBuffer.byteLength > MAX_PAYLOAD_SIZE) {
    return { ok: false, reason: 'Payload too large' };
  }

  const text = new TextDecoder().decode(arrayBuffer);
  return { ok: true, text, headers: res.headers };
}

async function crawlCompanySite(baseUrl) {
  if (!validateUrl(baseUrl)) {
    return { pages: [], skipped: [{ url: baseUrl, reason: 'Invalid or forbidden URL (SSRF Guard)' }] };
  }

  const base = new URL(baseUrl);
  const robotsUrl = `${base.protocol}//${base.host}/robots.txt`;
  
  let robots;
  try {
    const robotsRes = await fetch(robotsUrl, { method: 'GET', signal: AbortSignal.timeout(5000) });
    if (robotsRes.ok) {
      const robotsTxt = await robotsRes.text();
      robots = robotsParser(robotsUrl, robotsTxt);
    }
  } catch(e) {
    // Proceed without robots.txt if fetch fails
  }

  const pages = [];
  const skipped = [];
  
  try {
    const homeRes = await fetchWithLimit(baseUrl, 8000);
    if (!homeRes.ok) {
      skipped.push({ url: baseUrl, reason: homeRes.reason || `Status ${homeRes.status}` });
    } else {
      const contentType = homeRes.headers.get('content-type') || '';
      if (!contentType.includes('text/html') && !contentType.includes('text/plain')) {
        skipped.push({ url: baseUrl, reason: 'invalid content-type' });
      } else {
        const html = homeRes.text;
        const $ = cheerio.load(html);
        
        $('script, style, nav, footer, header').remove();
        const text = $('body').text().replace(/\s+/g, ' ').trim();
        
        pages.push({ url: baseUrl, text });
        
        const links = [];
        $('a').each((i, el) => {
          const href = $(el).attr('href');
          if (href) {
            try {
              const absolute = new URL(href, baseUrl).href;
              if (absolute.startsWith(baseUrl)) {
                links.push(absolute);
              }
            } catch(e) {}
          }
        });
        
        const uniqueLinks = [...new Set(links)];
        const candidateLinks = uniqueLinks.filter(l => /career|job|hiring|about|team|culture/i.test(l));
        
        let toFetch = [];
        if (candidateLinks.length > 3) {
          const schema = require('zod').array(require('zod').object({ url: require('zod').string(), score: require('zod').number() }));
          const linksText = candidateLinks.slice(0, 15).join('\n');
          const ranked = await callLLM('rankLinks', { links: linksText }, schema);
          if (ranked && Array.isArray(ranked)) {
            ranked.sort((a, b) => b.score - a.score);
            toFetch = ranked.slice(0, 3).map(r => r.url);
          } else {
            toFetch = candidateLinks.slice(0, 3);
          }
        } else {
          toFetch = candidateLinks;
        }
        
        for (const link of toFetch) {
          if (robots && robots.isDisallowed(link, '*')) {
            skipped.push({ url: link, reason: 'Disallowed by robots.txt' });
            continue;
          }
          
          try {
            const res = await fetchWithLimit(link, 8000);
            if (!res.ok) {
              skipped.push({ url: link, reason: res.reason || `Status ${res.status}` });
              continue;
            }
            const cType = res.headers.get('content-type') || '';
            if (cType.includes('text/html') || cType.includes('text/plain')) {
              const lHtml = res.text;
              const l$ = cheerio.load(lHtml);
              l$('script, style, nav, footer, header').remove();
              const lText = l$('body').text().replace(/\s+/g, ' ').trim();
              pages.push({ url: link, text: lText });
            } else {
              skipped.push({ url: link, reason: 'invalid content-type' });
            }
          } catch(e) {
            skipped.push({ url: link, reason: e.message });
          }
        }
      }
    }
  } catch (e) {
    skipped.push({ url: baseUrl, reason: e.message });
  }

  return { pages, skipped };
}

async function findInterviewProcessDiscussion(companyName) {
  const query = encodeURIComponent(`${companyName} interview process questions`);
  const url = `https://html.duckduckgo.com/html/?q=${query}`;
  
  try {
    const res = await fetchWithLimit(url, 10000);
    if (!res.ok) {
      return [];
    }
    const html = res.text;
    const $ = cheerio.load(html);
    const results = [];
    
    $('.result__body').each((i, el) => {
      if (i >= 3) return false;
      const snippet = $(el).find('.result__snippet').text().trim();
      const link = $(el).find('.result__url').text().trim();
      if (snippet && link) {
        results.push({ url: link, text: snippet });
      }
    });
    
    if (results.length === 0) return [];
    
    const combinedText = results.map(r => `Source: ${r.url}\n${r.text}`).join('\n\n');
    const schema = require('zod').array(require('zod').object({ source: require('zod').string(), keyFindings: require('zod').array(require('zod').string()) }));
    
    const extracted = await callLLM('extractInterviewProcess', { processData: combinedText }, schema);
    if (extracted && Array.isArray(extracted)) {
      return extracted;
    }
    return [];
  } catch(e) {
    return [];
  }
}

module.exports = { crawlCompanySite, findInterviewProcessDiscussion };
