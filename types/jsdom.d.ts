/** The part of jsdom the fact-sourcing scripts use; the package ships no types. */
declare module "jsdom" {
  export class JSDOM {
    constructor(html?: string);
    readonly window: { readonly document: Document };
  }
}
