#### To do

1. [x] EPUB 3 MVP
   1. [x] Create minimal package.opf file
   1. [x] Create minimal nav.xhtml
   1. [x] Package it up (zip) with mimetype and container.xml files
   1. [x] Implement addSection
   1. [x] Get epubcheck validation test working
1. [ ] Add essential features
   1. [x] Prettify XML source
   1. [x] EPUBv2 TOC
   1. [x] Author
   1. [x] Custom CSS
   1. [x] Exclude section from TOC
   1. [ ] Ability to set cover
1. [ ] Format CSS content?

   This is a tough one ... We're validating (and formatting) XML content. By that logic we
   should be doing the same to the CSS content. But finding a formatter that can handle
   CSS and XML will be trickier (js-beautify doesn't do XML) and potentially bloat this
   library (prettier is a whopping 11 MB!).

   But I think ideally we'd at the very least format the CSS:

   1. This will be consistent with how we're handling XML
   1. This will make the final packaged EPUB more polished
   1. If it also validates, it will be better for the library user to find out up front if
      there's a potential issue with the EPUB rather than waiting for it to fail on an end
      user's device.

   Requirements:

   - Browser and Node.js support
   - As small as possible
   - TypeScript support

   Some options:

   - https://www.npmjs.com/package/@adobe/css-tools
   - https://github.com/itw-creative-works/simply-beautiful
   - https://github.com/reworkcss/css
   - https://www.npmjs.com/package/clean-css

1. [ ] Set up GitHub Actions
1. [ ] Add remaining tests
   1. [x] Add per-file testing to full-featured EPUB tests
1. [ ] Add typedoc
   1. [ ] Make sure all public methods/interfaces/classes/etc are documented
   1. [ ] Add to pipeline
   1. [ ] Publish to GitHub Pages
1. [ ] Set up coveralls/test coverage
1. [ ] Create README

#### Later

- [ ] Add fonts
- [ ] Add images
- [ ] Add subsections
