Feature: Spot registry and per-spot thresholds

  Scenario: Fuerteventura spots resolve from the registry
    Given the spot id el-cotillo
    When I look it up in the registry
    Then I get El Cotillo in the Atlantic/Canary timezone

  Scenario: An unknown spot id resolves to nothing
    Given the spot id atlantis
    When I look it up in the registry
    Then no spot is found

  Scenario: Half a metre is a go at Donabate
    Given 0.5m waves at 6s with 12km/h offshore wind
    When I assess the hour at Donabate
    Then the verdict should be go

  Scenario: Half a metre is flat at El Cotillo
    Given 0.5m waves at 6s with 12km/h offshore wind
    When I assess the hour at El Cotillo
    Then the verdict should be flat

  Scenario: A spot without its own thresholds uses the defaults
    Given the spot id donabate
    When I resolve its thresholds
    Then the go-from threshold is 0.4m

  Scenario: A Fuerteventura spot carries its own thresholds
    Given the spot id el-cotillo
    When I resolve its thresholds
    Then the go-from threshold is 0.8m
