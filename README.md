# Boltz League Match Centre

Open the [Season 6 match centre](https://boltz-league-matchday.jpiyady.chatgpt.site/) and select **Ref Access** to sign in on the current page. The signed-in toolbar provides **Teams & squads**, **Fixtures**, **Live matches** and **Database**. Select **Edit fixture** or **Edit match** on a match card to open that fixture directly.

The spectator view loads a bundled programme, then refreshes squads, fixtures and published match events from the hosted league service while the page is visible. The service checks referee permissions before accepting updates. GitHub Pages uses a tab-local session that survives a reload and is validated by the service. Passwords belong in the hosted service configuration.

GitHub Pages serves the repository root from `main`. The legacy landing page forwards to the Match Centre using the league's public address and preserves bookmarks such as `#ref?section=live` and `#clubs/Foxes`. Use `?mirror=1` on the legacy URL to view the GitHub Pages build directly.
