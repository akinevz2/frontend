# TODO tracker

- root of the repo contains TODO.md
- please keep it updated as work is done
- every commit made to feat/rewrite branch
    - must include the TODO.md file with modifications
    - must accurately reflect changes included in the commit
    - must add done items for every staged file modified
    - must add planned items for every new file staged
- any file removed from the repo MUST correspond with an item in the TODO.md
- a file may only be removed when its corresponding item is moved to the bottom of the list

# CODE STYLE

- please extend the MVP prototype by creating additional empty modules
- ensure the naming system is consistent and easy to discuss
- when moving (refactoring) a piece of code from the old system
    - create an empty function in the destination code module
    - comment verbosely the functionality you will implement
    - delete the piece of code from the old system
    - perform one round of analysis which files now report errors
    - add references to the coupled systems to the comment
    - stub out (DO NOT TRY TO FIX) the errors
        - commenting out code is allowed
        - rewriting function signatures is allowed
        - any/unknown is not allowed

# SUBAGENTS

- you are limited to one grep/find per session in case you found the target you're searching for
- you may not read multiple files before you must perform refactoring
- iteratively alternating verifying current implementation and referencing related files is allowed
- you must always pick the most likely documentation file iff referencing its content is required