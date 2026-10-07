
import { type MusicContent, type MusicStats, type PageContent } from "@/content/types"
import { Window } from "./window/Window"
import { useContent } from "./hooks"
type Props = MusicStats<MusicContent<unknown>>
export const StatsBox = ({ trackCount, source: { name }, generatedAt }: Props) => {
    const content: PageContent<{}> = {
        className: "stats-box",
        content: [
            `${trackCount} tracks published by ${name}.`,
            `Generated at ${generatedAt}`,
        ]
    }

    return <Window content={useContent(content)}></Window>;
}