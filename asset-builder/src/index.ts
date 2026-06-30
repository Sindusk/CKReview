import fs from "fs-extra";

import { OUTPUT } from "./config";

async function main() {

    await fs.ensureDir(OUTPUT);

    console.log("Asset Builder");
    console.log("----------------");

    console.log("Output:");
    console.log(OUTPUT);

    console.log();

    console.log("Nothing to build yet.");

}

main().catch(console.error);