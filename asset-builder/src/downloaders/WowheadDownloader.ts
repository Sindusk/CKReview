import axios from "axios";
import fs from "fs-extra";
import path from "path";

import { OUTPUT } from "../config";
import { AssetDescriptor } from "../types/AssetDescriptor";
import { IAssetDownloader } from "./IAssetDownloader";

export class WowheadDownloader implements IAssetDownloader {

    public async download(asset: AssetDescriptor): Promise<void> {

        const url = this.buildUrl(asset);

        const outputDirectory = path.join(
            OUTPUT,
            asset.outputDirectory
        );

        await fs.ensureDir(outputDirectory);

        const outputFile = path.join(
            outputDirectory,
            `${asset.fileName}.jpg`
        );

        // Skip if already downloaded
        if (await fs.pathExists(outputFile)) {
            console.log(`✓ ${asset.fileName}.jpg already exists`);
            return;
        }

        console.log(`Downloading ${asset.name}`);

        try {

            const response = await axios.get(url, {
                responseType: "arraybuffer"
            });

            await fs.writeFile(
                outputFile,
                response.data
            );

            console.log(`✓ Saved ${asset.fileName}.jpg`);

        }
        catch (err) {

            console.error(
                `✗ Failed to download ${asset.name}`
            );

            console.error(err);

        }

    }

    private buildUrl(asset: AssetDescriptor): string {

        switch (asset.category) {

            case "class":
                return `https://wow.zamimg.com/images/wow/icons/large/classicon_${asset.fileName}.jpg`;

            case "spec":
                // We'll implement this next.
                throw new Error(
                    "Spec icons not implemented yet."
                );

            default:
                throw new Error(
                    `Unsupported asset category '${asset.category}'`
                );

        }

    }

}