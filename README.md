# Boltz League Match Centre

Open the [Season 6 match centre](https://johnbarsisa.github.io/boltz-league-match-centre/) and select **Ref Access** to sign in on the current page. The signed-in toolbar provides **Teams & squads**, **Fixtures**, **Live matches** and **Database**. Select **Edit fixture** or **Edit match** on a match card to open that fixture directly.

The spectator view loads a bundled programme, then refreshes squads, fixtures and published match events from the hosted league service while the page is visible. The service checks referee permissions before accepting updates. GitHub Pages uses a tab-local session that survives a reload and is validated by the service. Passwords belong in the hosted service configuration.

GitHub Pages serves the public website from the repository root on `main`. The hosted league service provides live data and referee access. Legacy Match Centre bookmarks redirect to GitHub Pages.
