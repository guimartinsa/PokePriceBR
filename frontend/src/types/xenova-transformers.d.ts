declare module "@xenova/transformers" {
  export type Pipeline = (
    input: unknown,
    options?: Record<string, unknown>,
  ) => Promise<unknown>;

  export function pipeline(
    task: string,
    model?: string,
    options?: Record<string, unknown>,
  ): Promise<Pipeline>;

  export const env: {
    allowLocalModels: boolean;
    allowRemoteModels: boolean;
  };
}
