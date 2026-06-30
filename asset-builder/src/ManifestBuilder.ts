import fs from "fs-extra";
import path from "path";

import type { AssetDescriptor } from "./types/AssetDescriptor";

export default class ManifestBuilder {
    static async write(
        outputFolder: string,
        assets: AssetDescriptor[]
    ) {
        await fs.ensureDir(outputFolder);

        const outputFile = path.join(
            outputFolder,
            "manifest.json"
        );

        await fs.writeJson(
            outputFile,
            assets,
            {
                spaces: 2
            }
        );

        console.log(
            `Manifest written (${assets.length} assets)`
        );
    }
}