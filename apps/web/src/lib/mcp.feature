Feature: The Tonnta MCP endpoint

  Scenario: A client negotiates capabilities
    Given a JSON-RPC initialize request
    When the endpoint handles it
    Then it answers with the protocol version and the server name

  Scenario: A client lists the tools
    Given a JSON-RPC tools/list request
    When the endpoint handles it
    Then it returns get_surf_conditions with an input schema

  Scenario: An agent asks whether Donabate is worth surfing
    Given conditions of 0.6m at 5s with a cross-off breeze
    When the agent calls get_surf_conditions
    Then the result leads with a readable summary naming the verdict and the board
    And the result also carries the numbers as structured content

  Scenario: A spot outside Ireland is named with its own country
    Given conditions at El Cotillo, Fuerteventura
    When the agent calls get_surf_conditions for that spot
    Then the summary places it in Spain, not Ireland
    And it links to that spot's own page rather than the home page

  Scenario: An unknown method is a JSON-RPC error
    Given a JSON-RPC request for a method that does not exist
    When the endpoint handles it
    Then it returns error -32601 and no result

  Scenario: A malformed envelope is rejected
    Given a body that is not a JSON-RPC request
    When the endpoint handles it
    Then it returns error -32600

  Scenario: A bad spot argument is rejected
    Given a tools/call request with an empty spot_id
    When the endpoint handles it
    Then it returns error -32602

  Scenario: A notification gets no response body
    Given a JSON-RPC notification with no id
    When the endpoint handles it
    Then nothing is returned
