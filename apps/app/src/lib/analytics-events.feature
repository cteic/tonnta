Feature: What the app tells analytics

  Scenario: Opening the outlook records the spot, verdict and board
    Given a GO outlook at Donabate on a foamie
    Then the outlook_viewed event carries spot "donabate", verdict "go" and board "foamie"

  Scenario: A verdict with no board records the board as null
    Given a FLAT outlook at Donabate
    Then the outlook_viewed event carries board null

  Scenario: Scrubbing records how far ahead the reader looked
    Given 24 chart hours where hour 15 is flat
    Then scrubbing to hour 15 records hours_ahead 15 and verdict "flat"
    And scrubbing past the end records nothing
