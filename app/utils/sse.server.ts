//Remix utils does not export these types that I use in ResponseHandler class, so had to manually define
interface SendFunctionArgs {
  event?: string;
  data: string;
}
export type SendFunction = (args: SendFunctionArgs) => void;
