import fs from "fs-extra";
import path from "path";

import { AssetDescriptor } from "../types/AssetDescriptor";
import { IAssetBuilder } from "./IAssetBuilder";

type WowSpec = {
    id: string;
    name: string;
    class: string;
    role: string;
    icon: string;
};

export class SpecBuilder implements IAssetBuilder {

    async build(): Promise<AssetDescriptor[]> {

        const specs: WowSpec[] =
            await fs.readJson(
                path.resolve(
                    "data/wow/specs.json"
                )
            );

        return specs.map(spec => ({

            game: "wow",

            category: "spec",

            name: spec.name,

            fileName: spec.id,

            outputDirectory: "spec",

            icon: spec.icon,

            metadata: {
                class: spec.class,
                role: spec.role,
            }

        }));
    }

}