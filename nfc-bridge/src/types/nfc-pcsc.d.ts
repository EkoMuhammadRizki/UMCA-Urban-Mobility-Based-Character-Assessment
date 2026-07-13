declare module "nfc-pcsc" {
  export class NFC {
    on(event: "reader", callback: (reader: any) => void): this;
    on(event: "error", callback: (error: any) => void): this;
  }
}
