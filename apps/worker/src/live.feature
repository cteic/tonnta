Feature: Live tide gauge stream for the app

  Scenario: A new client gets the last hour as a snapshot
    Given a gauge with an hour of readings
    When a client opens the live stream
    Then the stream tells the client to retry after 5 seconds
    And the first event is a snapshot of every reading with its trend

  Scenario: New gauge readings are sent as they arrive, once each
    Given a gauge with an hour of readings that reports again during the stream
    When a client opens the live stream
    Then the stream sends one reading event per new reading
    And heartbeats keep the connection open between them

  Scenario: A spot without a gauge has no stream
    When a client opens the live stream for spot "el-cotillo"
    Then the response status is 404

  Scenario: A gauge outage is reported before the stream closes
    Given a gauge that is unreachable
    When a client opens the live stream
    Then the stream ends with an error event
