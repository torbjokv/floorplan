Feature: JSON Editor
  As a user of the floorplan designer
  I want to edit floorplan JSON with validation and feedback
  So that I can define my floor plans accurately

  Background:
    Given I am on the floorplan designer page
    And localStorage is cleared

  Scenario: GUI editor is default tab on page load
    Then the GUI editor should be visible
    And the JSON editor should not be visible

  Scenario: Switching between JSON and GUI tabs
    When I click on the "GUI Editor" tab
    Then the GUI editor should be visible
    And the JSON editor should not be visible
    When I click on the "JSON Editor" tab
    Then the JSON editor should be visible
    And the GUI editor should not be visible

  Scenario: JSON syntax validation with valid JSON
    When I switch to the JSON tab
    And I enter valid JSON in the editor
    And I wait for 600ms
    Then no JSON error should be displayed
    And the floorplan should render successfully

  Scenario: JSON syntax validation with invalid JSON
    When I switch to the JSON tab
    And I enter invalid JSON in the editor
    And I wait for 600ms
    Then a JSON syntax error should be displayed
    And the error should contain "Expected"

  Scenario: Debounced auto-update after JSON changes
    When I switch to the JSON tab
    And I modify the grid_step value
    And I wait for 300ms
    Then the floorplan should not be updated yet
    When I wait for 300ms more
    Then the floorplan should be updated
    And the grid should reflect the new step size

  Scenario: Line numbers in JSON editor
    When I switch to the JSON tab
    Then line numbers should be visible
    And the line numbers should match the content lines

  Scenario: Synchronized scrolling between line numbers and editor
    When I switch to the JSON tab
    And I scroll the JSON editor down
    Then the line numbers should scroll accordingly

  Scenario: Real-time JSON validation feedback
    When I switch to the JSON tab
    And I start typing invalid JSON
    And I wait for 600ms
    Then a validation error should appear
    When I fix the JSON syntax
    And I wait for 600ms
    Then the validation error should disappear
