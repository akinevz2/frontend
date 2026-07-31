import { useMemo } from "react";
import { PageWithAddons } from "../components/Page";
import { processContent } from "../windowing/utils.ts";
import type { AddonProps } from "../components/Addon";
import addons from "../../addons.json";

const AddonsPage = () => {
    const { processed, metadata } = useMemo(
        () => processContent(addons as AddonProps),
        [],
    );

    return (
        <main>
            <PageWithAddons
                addons={processed as AddonProps}
                pageMetadata={{ sections: metadata }}
            />
        </main>
    );
};

export default AddonsPage;