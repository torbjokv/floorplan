Feature: Room Positioning System
  As a user of the floorplan designer
  I want to position rooms using the Zero Point and relative positioning system
  So that I can create complex floor plans easily

  Background:
    Given I am on the floorplan designer page
    And localStorage is cleared

  Scenario: Relative positioning using attachTo
    Given I have a room named "Living Room" attached to Zero Point
    When I create a room attached to "Living Room:top-right"
    Then the new room should be positioned adjacent to Living Room
    And both rooms should be visible in the preview

  Scenario: Using offset with relative positioning
    Given I have a room named "Kitchen" attached to Zero Point
    When I create a room attached to "Kitchen:bottom-left" with offset 500, 200
    Then the new room should be offset by 500mm in x and 200mm in y
    And the rooms should have a visible gap

  Scenario: Anchor point selection for attachment
    Given I have a room named "Bedroom" attached to Zero Point
    When I create a room with anchor "bottom-right" attached to "Bedroom:top-left"
    Then the room's bottom-right corner should align with Bedroom's top-left
    And both rooms should be correctly positioned

  Scenario: Zero Point positioning system
    When I create a room attached to "zeropoint:top-left"
    Then the room should be positioned at 0, 0
    And the room should be visible in the preview

  Scenario: Multiple rooms with Zero Point reference
    When I create room "A" attached to "zeropoint:top-left"
    And I create room "B" attached to "zeropoint:top-right"
    Then both rooms should be positioned relative to origin
    And the rooms should be visible on opposite sides

  Scenario: Validation error for missing Zero Point connection
    When I create rooms without any Zero Point attachment
    And I wait for 600ms
    Then a positioning error should be displayed
    And the error should mention "Zero Point"

  Scenario: Composite room with parts
    When I create a composite room with 2 parts
    And the parts attach to the parent room
    Then all parts should be rendered as one unified shape
    And internal borders should not be visible
    And the composite room should appear seamless

  Scenario: Composite room part referencing another part
    When I create a composite room with part A and part B
    And part B attaches to part A
    Then both parts should be correctly positioned
    And the composite room should render correctly

  Scenario: Detecting circular dependencies
    When I create room "A" attached to room "B"
    And I create room "B" attached to room "A"
    And I wait for 600ms
    Then a circular dependency error should be displayed
    And the error should mention both room names

  Scenario: Invalid room reference in attachTo
    When I create a room attached to "NonExistentRoom:top-left"
    And I wait for 600ms
    Then a positioning error should be displayed
    And the error should mention the invalid reference

  Scenario: Dependency resolution with multiple rooms
    When I create a chain of 5 rooms each attached to the previous
    Then all rooms should be resolved and positioned correctly
    And all 5 rooms should be visible in the preview

  Scenario: Maximum iteration limit for dependency resolution
    When I create a complex dependency chain beyond 20 levels
    And I wait for 600ms
    Then an error should be displayed about unresolved dependencies
    And successfully resolved rooms should still render
