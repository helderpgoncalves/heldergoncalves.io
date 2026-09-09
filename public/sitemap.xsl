<?xml version="1.0" encoding="UTF-8"?>
<!--
  Transforma o XML cru do sitemap numa página legível, para quem lá
  cai a direito no browser. O ficheiro .xml continua a ser o que os
  motores de busca leem — isto é só a folha de estilo que o browser
  aplica por cima, referenciada de write-sitemap via xslURL. Estático,
  copiado tal e qual de public/ para dist/ (invariante 8).
-->
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:sitemap="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:xhtml="http://www.w3.org/1999/xhtml">
  <xsl:output method="html" encoding="UTF-8" indent="yes" />

  <xsl:template match="/">
    <html lang="pt-PT">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Sitemap — heldergoncalves.io</title>
        <meta name="robots" content="noindex" />
        <style>
          :root { color-scheme: light dark; }
          * { box-sizing: border-box; }
          body {
            margin: 0; padding: 2.5rem 1.5rem 4rem;
            font: 16px/1.5 -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif;
            background: light-dark(#f5f5f7, #1c1c1e);
            color: light-dark(#1d1d1f, #f5f5f7);
          }
          main { max-width: 40rem; margin: 0 auto; }
          h1 { font-size: 1.5rem; font-weight: 600; margin: 0 0 0.25rem; }
          p.lead { color: light-dark(#6e6e73, #98989d); margin: 0 0 2rem; font-size: 0.9375rem; }
          table {
            width: 100%; border-collapse: collapse;
            background: light-dark(#fff, #2c2c2e);
            border-radius: 1rem; overflow: hidden;
            box-shadow: 0 1px 2px rgba(0,0,0,.06);
          }
          th, td { text-align: left; padding: 0.75rem 1rem; font-size: 0.9375rem; }
          th {
            font-weight: 600; font-size: 0.8125rem; text-transform: uppercase;
            letter-spacing: 0.02em; color: light-dark(#6e6e73, #98989d);
            border-bottom: 1px solid light-dark(#e5e5ea, #3a3a3c);
          }
          tr + tr td { border-top: 1px solid light-dark(#e5e5ea, #3a3a3c); }
          a { color: light-dark(#2e5aa8, #6ea8ff); text-decoration: none; word-break: break-all; }
          a:hover { text-decoration: underline; }
          .langs { color: light-dark(#6e6e73, #98989d); font-size: 0.8125rem; white-space: nowrap; }
          footer { margin-top: 2rem; font-size: 0.8125rem; color: light-dark(#6e6e73, #98989d); }
          footer a { color: inherit; text-decoration: underline; }
        </style>
      </head>
      <body>
        <main>
          <xsl:choose>
            <xsl:when test="sitemap:sitemapindex">
              <h1>Índice de sitemaps</h1>
              <p class="lead">
                <xsl:value-of select="count(sitemap:sitemapindex/sitemap:sitemap)" />
                ficheiro(s) — cada um lista até 45000 URLs.
              </p>
              <table>
                <tr><th>Ficheiro</th></tr>
                <xsl:for-each select="sitemap:sitemapindex/sitemap:sitemap">
                  <tr>
                    <td><a href="{sitemap:loc}"><xsl:value-of select="sitemap:loc" /></a></td>
                  </tr>
                </xsl:for-each>
              </table>
            </xsl:when>
            <xsl:otherwise>
              <h1>Sitemap</h1>
              <p class="lead">
                <xsl:value-of select="count(sitemap:urlset/sitemap:url)" /> URLs.
              </p>
              <table>
                <tr><th>URL</th><th>Línguas</th></tr>
                <xsl:for-each select="sitemap:urlset/sitemap:url">
                  <tr>
                    <td><a href="{sitemap:loc}"><xsl:value-of select="sitemap:loc" /></a></td>
                    <td class="langs">
                      <xsl:for-each select="xhtml:link">
                        <xsl:value-of select="@hreflang" />
                        <xsl:if test="position() != last()">, </xsl:if>
                      </xsl:for-each>
                    </td>
                  </tr>
                </xsl:for-each>
              </table>
            </xsl:otherwise>
          </xsl:choose>
          <footer>
            Gerado automaticamente. Ver também <a href="/robots.txt">robots.txt</a> e <a href="/llms.txt">llms.txt</a>.
          </footer>
        </main>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
