// Canonical-host redirect: send www.meatup.love → meatup.love (301), preserving
// path and query. Everything else (apex, *.pages.dev, the OG functions) passes
// through untouched. www is attached to this same Pages project as a custom
// domain, so without this it would serve a duplicate origin.
export const onRequest = async (context) => {
  const url = new URL(context.request.url)
  if (url.hostname === 'www.meatup.love') {
    url.hostname = 'meatup.love'
    return Response.redirect(url.toString(), 301)
  }
  return context.next()
}
