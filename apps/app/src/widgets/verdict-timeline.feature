Feature: What the home-screen widget shows for each hour

  Scenario: A GO hour shows the verdict, its Irish name and the board
    Given a timeline whose first hour is GO on a foamie
    When I turn it into widget entries
    Then the first entry reads "GO" under "Téigh"
    And the board line reads "Foamie day"
    And the verdict is drawn in dawn amber

  Scenario: A flat hour uses ink text on the pale sea
    Given a timeline whose first hour is flat
    When I turn it into widget entries
    Then the first entry reads "FLAT" under "Ciúin"
    And the board line is empty
    And the text is ink, not fog

  Scenario: Entries are dated at the start of each hour and labelled in local time
    Given a timeline whose first hour is GO on a foamie
    When I turn it into widget entries
    Then there is one entry per hour
    And the first entry is dated 15:00 UTC
    And its footer reads "Donabate · 16:00"

  Scenario: The current entry is the hour that contains now
    Given a timeline whose first hour is GO on a foamie
    When I pick the entry for 16:40 UTC
    Then the picked entry is dated 16:00 UTC

  Scenario: A malformed response is rejected
    Given an endpoint that returns hours without a verdict
    When the widget fetches the timeline
    Then the fetch fails with "unexpected response shape"

  Scenario: A stalled endpoint times out
    Given an endpoint that never responds
    When the widget fetches the timeline with a 20ms timeout
    Then the fetch fails with "no response within 20ms"

  Scenario: An endpoint that stalls after its headers times out
    Given an endpoint that sends headers and then never finishes the body
    When the widget fetches the timeline with a 20ms timeout
    Then the fetch fails with "no response within 20ms"
