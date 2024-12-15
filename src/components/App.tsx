import { useEffect } from "react"
import { Page } from "./Page"
import "../main.css"
import sections from "../../sections.json"


export type AppProps = {
    title: string
}

export const App = (props: AppProps) => {
    // set title
    useEffect(() => {
        document.title = props.title
    }, [props.title])

    return <Page sections={sections} />
}