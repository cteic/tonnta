Feature: Reading the weather for the water

  Scenario: Thunderstorm codes are recognised
    Then weather codes 95, 96 and 99 are thunderstorms and 3 and 61 are not

  Scenario: Sea temperature bands give advice for an Irish beach
    Then 8°C is baltic, 11°C is bracing, 14°C is fresh, 17°C is mild and 20°C is warm
