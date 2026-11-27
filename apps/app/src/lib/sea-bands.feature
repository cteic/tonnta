Feature: Living sea bands

  Scenario: Messy onshore seas drift faster and shorter than glassy ones
    Given a 0.8 m sea with 30 km/h onshore wind and a 0.8 m sea with no wind
    Then the onshore bands are shorter and drift faster

  Scenario: Band height follows the waves within limits
    Given a 0.05 m ripple and a 3 m swell
    Then the ripple band keeps a visible minimum height and the swell band is capped

  Scenario: A band path repeats once per wavelength
    Given a band 220 points long drawn 440 points wide
    Then the path holds two full waves and closes at the bottom
