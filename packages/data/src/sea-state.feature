Feature: One word for the sea surface

  Each word comes from a number rule. The word describes the water, not
  whether to go. When no rule fits, there is no word.

  Scenario: Small waves read Flat whatever the wind
    Given waves of 0.2m and onshore wind at 30km/h
    Then the sea-state word is "Flat"

  Scenario: Light wind reads Glassy
    Given waves of 0.6m and onshore wind at 6km/h
    Then the sea-state word is "Glassy"

  Scenario: Offshore wind under 30km/h reads Clean
    Given waves of 0.6m and offshore wind at 20km/h
    Then the sea-state word is "Clean"

  Scenario: Onshore wind at 15km/h or more reads Choppy
    Given waves of 0.6m and onshore wind at 15km/h
    Then the sea-state word is "Choppy"

  Scenario: No rule fits, so there is no word
    Given waves of 0.6m and onshore wind at 12km/h
    Then there is no sea-state word

  Scenario: Strong offshore wind gets no word
    Given waves of 0.6m and offshore wind at 30km/h
    Then there is no sea-state word

  Scenario: The rule reads the wind as the page prints it
    Given waves of 0.6m and onshore wind at 14.6km/h
    Then the sea-state word is "Choppy"

  Scenario: A glassy wind label always reads Glassy
    Given waves of 0.6m and a glassy wind at 7.6km/h
    Then the sea-state word is "Glassy"

  Scenario: A missing value gets no word
    Given waves of an unknown height and offshore wind at 20km/h
    Then there is no sea-state word
