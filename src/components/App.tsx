import { useEffect } from "react"
import { Page } from "./Page"
import "../main.css"


const sections = [
    {
        heading: "Welcome to Kirill's website!"
    },
    {
        heading: "what is kine",
        content: "Kirill's online username",
    },
    {
        heading: "who is kine",
        content: [
            {
                heading: "current occupation",
                content: "a student"
            },
            {
                heading: "current hobbies",
                content: "computing"
            },
            {
                heading: "current location",
                content: "england"
            }
        ]
    },
    {
        heading: "what is kine doing now",
        content: [
            "rewriting this website",
            "finishing university",
            "looking for work",
        ]
    },
    {
        heading: "what is kine interested in",
        content: [
            {
                heading: "programming",
                content: [
                    "Java",
                    "Scala",
                    "Python",
                    "Rust",
                    "Typescript",
                    "Machine Learning",
                ]
            },
            {
                heading: "system administration",
                content: [
                    "Docker",
                    "Hyper-V",
                    "Linux & Windows Scripting",
                    "Pandoc and VCS"
                ]
            },
            {
                heading: "teaching and tutoring",
                content: [
                    "Linux",
                    "Programming",
                    "English Language"
                ]
            }
        ]
    },
    {
        heading: "where has kine been",
        content: [
            {
                heading: "for studies",
                content: "currently at University of Sussex"
            },
            {
                heading: "for work",
                content: [
                    "at Revolent Group (Salesforce)",
                    "in the wild (freelance)",
                    "at CMS (during merger w/ Nabarro+Olswang)"
                ]
            }
        ]
    }
]

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