Feature: Native surf forecast

  Scenario: Missing hours stay missing in the forecast and chart
    Given a fresh forecast with no current hour and a gap between later hours
    Then no later hour is presented as current
    And the chart shows the missed hour and breaks the plotted lines

  Scenario: An old forecast expires while the app is open
    Given forecast data checked an hour ago
    Then the forecast is marked stale instead of showing the old values

  Scenario: After dark the first-light preview reports forecast conditions
    Given an after-dark forecast with data for the hour the sun rises in
    Then sunrise and first-light wave and wind conditions are available
    And the chart announces the darkness and forecast values

  Scenario: The first-light label gives sunrise, not the start of the hour
    Given an after-dark forecast with data for the hour the sun rises in
    Then the first-light label says the preview holds from sunrise

  Scenario: A missing first-light hour stays unavailable
    Given an after-dark forecast with a later hour but no first-light hour
    Then sunrise is available and the first-light forecast is missing

  Scenario: The headline lists the current hour's facts separately
    Given a current hour of 0.6 m at 5 s with 12 km/h offshore wind
    Then the headline facts are waves, period and wind against the beach

  Scenario: The surf rating gives its reason
    Given a current hour of 0.6 m at 5 s with 12 km/h offshore wind
    Then the surf is rated good with its facts and no advice to go

  Scenario: A short-period sea is not rated good
    Given a current hour of 0.6 m at 3 s with 12 km/h offshore wind
    Then the surf is rated marginal because breaking surf is unconfirmed

  Scenario: A strong onshore wind is rated blown out
    Given a current hour of 0.8 m at 6 s with 40 km/h onshore wind
    Then the surf is rated blown out without advice

  Scenario: A day's detail lists its daylight hours with sunrise and sunset
    Given a forecast for every hour of tomorrow
    Then the day detail gives sunrise and sunset for tomorrow
    And it lists only full daylight hours, in order, with their facts

  Scenario: A day's detail starts from the current hour
    Given a forecast for every hour of today, viewed at midday
    Then the day detail lists no hour before the current one

  Scenario: Missing hours stay out of a day's detail
    Given a forecast for tomorrow with no data at 12:00
    Then the day detail has no 12:00 row and does not fill the gap
