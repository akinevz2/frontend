import { useMemo } from "react";
import { PageWithAddons } from "../components/Page";
import { processContent } from "../windows/utils";
import type { AddonProps } from "../components/Addon";
import addons from "./structure/addons.json";

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
