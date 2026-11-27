Feature: Swell map data for the web map

  Scenario: The latest manifest is served briefly cached
    Given the bucket holds a latest manifest
    When a client requests "/swell-map/latest.json"
    Then the response status is 200
    And the content type is "application/json"
    And the response caches for 300 seconds

  Scenario: A run's frame is served as an image that never changes
    Given the bucket holds frame "f006.png" for run "2026112706"
    When a client requests "/swell-map/runs/2026112706/f006.png"
    Then the response status is 200
    And the content type is "image/png"
    And the response is cached as immutable

  Scenario Outline: Paths the encoder never writes are refused without reading the bucket
    When a client requests "<path>"
    Then the response status is 404
    And the bucket was not read

    Examples:
      | path                                   |
      | /swell-map/runs/2026112706/../x.png    |
      | /swell-map/runs/latest/f006.png        |
      | /swell-map/runs/2026112706/f6.png      |
      | /swell-map/secrets.json                |
      | /swell-map/runs/2026112706/f006.png/x  |

  Scenario: A frame missing from the bucket is not found
    Given an empty bucket
    When a client requests "/swell-map/runs/2026112706/f009.png"
    Then the response status is 404

  Scenario: The worker says so when no bucket is bound
    Given no bucket is bound
    When a client requests "/swell-map/latest.json"
    Then the response status is 503
