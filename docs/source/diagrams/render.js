const { chromium } = require('playwright');
const fs = require('fs'); const path = require('path');
const [mermaidJs, outDir, ...files] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch();
  for (const f of files) {
    const p = await b.newPage({ viewport: { width: 1400, height: 1000 }, deviceScaleFactor: 2 });
    await p.setContent(`<html><body style="margin:0;background:#fff"><div id="c"></div></body></html>`);
    await p.addScriptTag({ path: mermaidJs });
    const def = fs.readFileSync(f, 'utf8');
    const err = await p.evaluate(async (def) => {
      mermaid.initialize({ startOnLoad: false, theme: 'base', securityLevel: 'loose',
        themeVariables: { primaryColor: '#E3F4F3', primaryBorderColor: '#1F9E96', primaryTextColor: '#11181C',
          lineColor: '#4A5A5E', fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '15px',
          secondaryColor: '#F2F5F5', tertiaryColor: '#FFFFFF', clusterBkg: '#F7FAFA', clusterBorder: '#B8D9D6' },
        flowchart: { curve: 'basis', padding: 12 }, er: { layoutDirection: 'TB' } });
      try { const { svg } = await mermaid.render('g', def); document.getElementById('c').innerHTML = svg; return null; }
      catch (e) { return String(e); }
    }, def);
    if (err) { console.log('ERR', f, err); continue; }
    const el = await p.$('#c svg');
    await el.screenshot({ path: path.join(outDir, path.basename(f, '.mmd') + '.png'), omitBackground: false });
    await p.close();
  }
  await b.close();
})();
