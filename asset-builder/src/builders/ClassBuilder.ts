import fs from "fs-extra";
import path from "path";

import { AssetDescriptor } from "../types/AssetDescriptor";
import { IAssetBuilder } from "./IAssetBuilder";

type WowClass = {
    id: string;
    name: string;
    color: string;
};

export class ClassBuilder implements IAssetBuilder {

    async build(): Promise<AssetDescriptor[]> {

        const classes: WowClass[] =
            await fs.readJson(
                path.resolve(
                    "data/wow/classes.json"
                )
            );

        return classes.map(c => ({
            game: "wow",

            category: "class",

            name: c.name,

            fileName: c.id,

            outputDirectory: "class",

            metadata: {
                color: c.color
            }
        }));
    }
}