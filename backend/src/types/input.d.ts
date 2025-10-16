declare module "input" {
  function text(prompt?: string): Promise<string>;
  const input: {
    text: typeof text;
  };
  export default input;
}

