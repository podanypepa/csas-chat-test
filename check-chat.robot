*** Settings ***
Library           Browser    timeout=30s
Suite Teardown    Close Browser

*** Variables ***
${URL}               https://www.csas.cz
${COOKIE_TIMEOUT}    5s
${MAX_RETRIES}       3x
${RETRY_INTERVAL}    10s

*** Test Cases ***
Chat On CSAS.CZ Is Available
    [Documentation]    Verifies chat availability on csas.cz in 4 steps.
    ...                Retries up to ${MAX_RETRIES} with ${RETRY_INTERVAL} pause between attempts.
    Wait Until Keyword Succeeds    ${MAX_RETRIES}    ${RETRY_INTERVAL}    Verify Chat Is Working

*** Keywords ***
Verify Chat Is Working
    [Teardown]    Run Keyword And Ignore Error    Close Browser

    Log    1. Loading page...
    New Browser    chromium    headless=true
    New Context    viewport={'width': 1280, 'height': 720}
    New Page       ${URL}

    Log    Accepting cookies...
    Run Keyword And Ignore Error    Click    button:has-text("Souhlasím")    timeout=${COOKIE_TIMEOUT}

    Log    2. Waiting for "Chat" button...
    Wait For Elements State    .webchat.minimized .teaser    visible

    Log    3. Opening chat...
    Click    .webchat.minimized .teaser
    Wait For Elements State    .webchat.expanded .chat-container    visible

    Log    4. Waiting for welcome message...
    Wait For Elements State    .event--bot .event-content__text    visible
    ${text}=    Get Text    .event--bot .event-content__text >> nth=0
    Should Not Be Empty    ${text}    Welcome message is empty
    Log    Welcome message: ${text}
