Feature: Letting the site's own pages call the alert worker

  Scenario: The apex, www and staging sites are all allowed
    Given the site origin https://tonnta.surf and www and staging on the allow-list
    When a browser on https://www.tonnta.surf calls the worker
    Then the response allows https://www.tonnta.surf
    And the response varies by origin

  Scenario: Any other site keeps the site origin
    Given the site origin https://tonnta.surf and www and staging on the allow-list
    When a browser on https://example.com calls the worker
    Then the response allows only https://tonnta.surf

  Scenario: The site origin is allowed even with no allow-list
    Then an empty allow-list still allows https://tonnta.surf
