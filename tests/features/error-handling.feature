Feature: Error Handling and Validation
  As a user of the floorplan designer
  I want clear error messages when something goes wrong
  So that I can quickly fix issues in my floor plan

  Background:
    Given I am on the floorplan designer page
    And localStorage is cleared

  Scenario: JSON syntax error display
    When I switch to the JSON tab
    And I enter invalid JSON with a syntax error
    And I wait for 600ms
    Then a JSON syntax error should be displayed with ❌ icon
    And the error message should describe the syntax problem
    And the floorplan should not render until fixed

  Scenario: Clear error messages for JSON errors
    When I switch to the JSON tab
    And I enter JSON with a missing comma
    And I wait for 600ms
    Then the error message should be clear and actionable
    And the error should indicate the approximate location

  Scenario: Positioning error display
    When I create a room with attachTo referencing non-existent room
    And I wait for 600ms
    Then a positioning error should be displayed with ⚠️ icon
    And the error should not block rendering of other rooms
    And valid rooms should still render successfully

  Scenario: Multiple positioning errors
    When I create 3 rooms with different positioning errors
    And I wait for 600ms
    Then all 3 errors should be listed separately
    And each error should identify the specific room
    And each error should describe the specific problem

  Scenario: Circular dependency detection and reporting
    When I create room "A" that references room "B"
    And I create room "B" that references room "A"
    And I wait for 600ms
    Then a circular dependency error should be displayed
    And the error should mention both "A" and "B"
    And the error should explain the circular reference

  Scenario: Invalid room reference error
    When I create a room with invalid reference "GhostRoom:top-left"
    And I wait for 600ms
    Then an error should indicate the room doesn't exist
    And the error should mention "GhostRoom"
    And the error should be clear about what's wrong

  Scenario: Missing required properties error
    When I create a room missing the "width" property
    And I wait for 600ms
    Then an error should indicate missing required property
    And the error should specify which property is missing

  Scenario: Invalid anchor syntax error
    When I create a room with malformed anchor reference
    And I wait for 600ms
    Then an error should describe the invalid anchor syntax
    And the error should provide an example of correct syntax

  Scenario: Zero Point validation warning
    When I create rooms without any Zero Point attachment
    And I wait for 600ms
    Then an error should be displayed
    And the error should mention "Zero Point"
    And the error should explain that at least one room must attach to Zero Point

  Scenario: Maximum iterations exceeded
    When I create dependencies that cannot be resolved in 20 iterations
    And I wait for 600ms
    Then an error about unresolved dependencies should appear
    And the error should list which rooms couldn't be resolved
    And successfully positioned rooms should still render

  Scenario: Error recovery after fixing JSON
    Given I have a JSON syntax error displayed
    When I fix the syntax error in the editor
    And I wait for 600ms
    Then the error message should disappear
    And the floorplan should render successfully
    And no error indicators should be visible

  Scenario: Error recovery after fixing positioning
    Given I have a positioning error for room "Office"
    When I fix the positioning reference
    And I wait for 600ms
    Then the positioning error should disappear
    And the room should render successfully

  Scenario: Partial rendering with errors
    When I have 5 rooms total with 2 having errors
    And I wait for 600ms
    Then the 3 valid rooms should render
    And errors for the 2 invalid rooms should be displayed
    And the preview should show the partial floor plan

  Scenario: No error state (valid floor plan)
    When I create a valid floor plan with multiple rooms
    And I wait for 600ms
    Then no errors should be displayed
    And no error indicators should be visible
    And all rooms should render successfully

  Scenario: Error display location in editor
    When an error occurs
    Then the error should be displayed in the editor pane
    And the error should be clearly visible to the user
    And the error should not obstruct the editing area

  Scenario: Distinguishing errors vs warnings
    When I have both JSON errors and positioning warnings
    Then JSON errors should display with ❌ icon
    And positioning warnings should display with ⚠️ icon
    And the visual distinction should be clear

  Scenario: Error persistence across tab switches
    Given I have an error in the JSON editor
    When I switch to the GUI editor tab
    And I switch back to the JSON editor tab
    Then the error should still be displayed
    And the error message should be preserved

  Scenario: Schema validation for door properties
    When I create a door missing the "room" property
    And I wait for 600ms
    Then an error should indicate missing required door property

  Scenario: Schema validation for window properties
    When I create a window missing the "width" property
    And I wait for 600ms
    Then an error should indicate missing required window property

  Scenario: Invalid wall position for door
    When I create a door with wall position "diagonal"
    And I wait for 600ms
    Then an error should indicate invalid wall position
    And valid wall positions should be suggested

  Scenario: Invalid swing direction for door
    When I create a door with invalid swing direction
    And I wait for 600ms
    Then an error should indicate invalid swing value
    And valid swing directions should be mentioned
