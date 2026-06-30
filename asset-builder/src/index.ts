import fs from "fs-extra";
import ManifestBuilder from "./ManifestBuilder";
import { WowheadDownloader } from "./downloaders/WowheadDownloader";

import { OUTPUT } from "./config";

import { ClassBuilder } from "./builders/ClassBuilder";

async function main() {
  await fs.ensureDir(OUTPUT);

  console.log("Asset Builder");
  console.log("----------------");

  const builders = [
    new ClassBuilder(),
  ];

  let assets = [];

  for (const builder of builders) {
    const built = await builder.build();

    assets.push(...built);
  }

  await ManifestBuilder.write(
        OUTPUT,
        assets
  );

  const downloader = new WowheadDownloader();

    for (const asset of assets) {
        await downloader.download(asset);
    }

  console.log(`Generated ${assets.length} assets.`);

  console.table(
    assets.map((asset) => ({
      Category: asset.category,
      Name: asset.name,
      Output: asset.outputDirectory,
      File: asset.fileName,
    }))
  );
}

main().catch(console.error);