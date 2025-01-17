import { useEffect } from "react"
import "../main.css"
import sections from "../sections.json"
import { Page } from "./Page"


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