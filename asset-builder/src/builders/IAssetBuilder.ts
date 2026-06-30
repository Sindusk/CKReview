import { AssetDescriptor } from "../types/AssetDescriptor";

export interface IAssetBuilder {
  build(): Promise<AssetDescriptor[]>;
}