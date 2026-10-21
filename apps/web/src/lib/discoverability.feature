Feature: Crawler-facing artefacts

  Scenario: The live site publishes content signals and a sitemap
    Given the production host tonnta.surf
    When I build the robots.txt body
    Then it carries the Content-Signal line allowing search and AI input but not training
    And it reserves rights under Article 4 of the EU copyright directive
    And it allows crawling and points at the sitemap
    And it keeps crawlers out of the API path but leaves the MCP endpoint open

  Scenario: Training-only crawlers are blocked, citation crawlers are not
    Given the production robots.txt body
    When I read the per-crawler groups
    Then every training-only crawler has its own Disallow group
    And no citation or grounding crawler is blocked
    And the wildcard group still allows the site

  Scenario: A preview deployment is closed to crawlers
    Given a Workers versioned preview host
    When I build the robots.txt body
    Then it disallows everything
    And it carries no Content-Signal line and no sitemap

  Scenario: Only the live domain counts as production
    Given the live domain, the workers.dev alias, a preview host and localhost
    When I check each for production
    Then only the two tonnta.surf hosts are production

  Scenario: The sitemap lists every public route
    Given the production origin
    When I build the sitemap entries
    Then it lists the home page, the session log and the Pro page as absolute URLs
    And it lists a spot route for every spot except the default one
    And the home page is the highest priority entry

  Scenario: Robots meta directives follow the host
    Given the production host and a preview host
    When I build the robots meta for each
    Then the production host is indexed and followed
    And the preview host is neither indexed nor followed
