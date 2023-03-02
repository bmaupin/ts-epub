import * as css from '@adobe/css-tools';
import { XMLParser, XMLBuilder } from 'fast-xml-parser';

export const validateAndPrettifyCss = (sourceCss: string): string => {
  return css.stringify(css.parse(sourceCss));
};

export const validateAndPrettifyXml = (sourceXml: string): string => {
  const parser = new XMLParser({
    // The default behaviour is to strip XML attributes 🤔 This option must be used in the
    // parser and the builder
    ignoreAttributes: false,
    // This seems to strip the newline from the end of the XML. This option must be used
    // in the parser and the builder
    preserveOrder: true,
  });
  // The second parameter will cause the parser to throw if there's a validation error
  const parsedXml = parser.parse(sourceXml, true);

  const builder = new XMLBuilder({
    // The default is to output the XML with all whitespace between tags removed
    format: true,
    ignoreAttributes: false,
    preserveOrder: true,
    // This prevents self-closing tags from being converted
    suppressEmptyNode: true,
  });
  return builder.build(parsedXml);
};
