Feature: JSON-LD structured data

  Scenario: The site graph identifies the organisation and the website
    When I build the site graph
    Then it is a schema.org graph holding an Organization and a WebSite
    And the WebSite is published by the Organization

  Scenario: The home graph describes the app, the beach and the forecast data
    When I build the home graph for Donabate
    Then it holds a WebApplication, a Place and a Dataset

  Scenario: The beach carries real coordinates and its containing region
    When I build the home graph for Donabate
    Then the Place geo matches the spot registry coordinates
    And the Place sits in County Dublin, Ireland

  Scenario: The forecast is described as a dataset
    When I build the home graph for Donabate
    Then the Dataset covers the seven days from today
    And the Dataset measures wave height, period, wind and tide
    And the Dataset is distributed through the MCP endpoint

  Scenario: The app is a free web application
    When I build the home graph for Donabate
    Then the WebApplication is a free SportsApplication running on the Web

  Scenario: No FAQ markup is invented
    When I build the site graph
    Then no node claims to be an FAQPage
