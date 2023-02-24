import * as css from '@adobe/css-tools';
import xml2js from 'isomorphic-xml2js';

export const validateAndPrettifyCss = (sourceCss: string): string => {
  return css.stringify(css.parse(sourceCss));
};

// This is primarily for prettifying the XML, which makes testing easier (we don't have
// to worry about whitespace for the XML templates) and also makes the final generated
// EPUB nicer. Because this has to parse the XML to prettify it, it also acts as a
// sanity check for ensuring the source is valid XML as it will throw an error if not.
export const validateAndPrettifyXml = async (
  sourceXml: string
): Promise<string> => {
  const parsedXml = await xml2js.parseStringPromise(sourceXml);

  // xml2js adds 'standalone="yes"' to the XML header. It's not a big deal, but to keep
  // things to a minimum, add the header manually
  const xmlHeader = '<?xml version="1.0" encoding="UTF-8"?>\n';
  const builder = new xml2js.Builder({
    headless: true,
  });
  return `${xmlHeader}${builder.buildObject(parsedXml)}`;
};
