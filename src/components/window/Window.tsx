import type { Content } from "../../types";

export function Window(props: Content) {

    return <>
        <Body className="window">
            <TitleBar></TitleBar>
            <ContentArea>
                props
            </ContentArea>
        </Body>

    </>
}