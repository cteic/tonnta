Feature: Native surf forecast

  Scenario: Missing hours stay missing in the forecast and chart
    Given a fresh forecast with no current hour and a gap between later hours
    Then no later hour is presented as current
    And the chart shows the missed hour and breaks the plotted lines

  Scenario: An old forecast expires while the app is open
    Given forecast data checked an hour ago
    Then the forecast is marked stale instead of showing the old values

  Scenario: After dark the first-light preview reports forecast conditions
    Given an after-dark forecast with data for the first full daylight hour
    Then sunrise and first-light wave and wind conditions are available
    And the chart announces the darkness and forecast values

  Scenario: A missing first-light hour stays unavailable
    Given an after-dark forecast with a later hour but no first-light hour
    Then sunrise is available and the first-light forecast is missing

  Scenario: The headline lists the current hour's facts separately
    Given a current hour of 0.6 m at 5 s with 12 km/h offshore wind
    Then the headline facts are waves, period and wind against the beach
