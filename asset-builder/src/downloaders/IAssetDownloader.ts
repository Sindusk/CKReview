import { AssetDescriptor } from "../types/AssetDescriptor";

export interface IAssetDownloader {

    download(
        asset: AssetDescriptor
    ): Promise<void>;

}