Feature: Room Resizing with Drag Handles
  As a user of the floorplan designer
  I want to resize rooms by dragging their edges
  So that I can adjust room dimensions visually

  Background:
    Given I am on the floorplan designer page
    And localStorage is cleared

  Scenario: Resize handles appear on room hover
    Given I have a room with size 4000x3000 attached to Zero Point
    When I hover over the room in the preview
    Then resize handles should appear on all four edges
    And the left edge handle should be visible at the middle of the left edge
    And the right edge handle should be visible at the middle of the right edge
    And the top edge handle should be visible at the middle of the top edge
    And the bottom edge handle should be visible at the middle of the bottom edge

  Scenario: Resize handle appearance and styling
    Given I have a room with size 4000x3000 attached to Zero Point
    When I hover over the room in the preview
    Then the resize handles should have distinct visual styling
    And the left and right handles should show horizontal resize cursor
    And the top and bottom handles should show vertical resize cursor

  Scenario: Drag right edge to increase width
    Given I have a room "testroom" with size 4000x3000 attached to Zero Point
    When I hover over the room in the preview
    And I drag the right edge handle by 1000mm to the right
    And I wait for 600ms
    Then the room width should be 5000mm
    And the room depth should remain 3000mm
    And the DSL should reflect the updated width

  Scenario: Drag right edge to decrease width
    Given I have a room "testroom" with size 4000x3000 attached to Zero Point
    When I hover over the room in the preview
    And I drag the right edge handle by 1000mm to the left
    And I wait for 600ms
    Then the room width should be 3000mm
    And the room depth should remain 3000mm
    And the DSL should reflect the updated width

  Scenario: Drag left edge to change width (moves room and adjusts width)
    Given I have a room "testroom" with size 4000x3000 attached to Zero Point
    When I hover over the room in the preview
    And I drag the left edge handle by 500mm to the left
    And I wait for 600ms
    Then the room width should be 4500mm
    And the room should have moved 500mm to the left
    And the DSL should reflect the updated dimensions and position

  Scenario: Drag bottom edge to increase depth
    Given I have a room "testroom" with size 4000x3000 attached to Zero Point
    When I hover over the room in the preview
    And I drag the bottom edge handle by 1000mm down
    And I wait for 600ms
    Then the room width should remain 4000mm
    And the room depth should be 4000mm
    And the DSL should reflect the updated depth

  Scenario: Drag bottom edge to decrease depth
    Given I have a room "testroom" with size 4000x3000 attached to Zero Point
    When I hover over the room in the preview
    And I drag the bottom edge handle by 500mm up
    And I wait for 600ms
    Then the room width should remain 4000mm
    And the room depth should be 2500mm
    And the DSL should reflect the updated depth

  Scenario: Drag top edge to change depth (moves room and adjusts depth)
    Given I have a room "testroom" with size 4000x3000 attached to Zero Point
    When I hover over the room in the preview
    And I drag the top edge handle by 500mm up
    And I wait for 600ms
    Then the room depth should be 3500mm
    And the room should have moved 500mm up
    And the DSL should reflect the updated dimensions and position

  Scenario: Minimum room size constraint - width
    Given I have a room "testroom" with size 2000x3000 attached to Zero Point
    When I hover over the room in the preview
    And I drag the right edge handle by 1500mm to the left
    And I wait for 600ms
    Then the room width should be 500mm
    And the room should not go below minimum width

  Scenario: Minimum room size constraint - depth
    Given I have a room "testroom" with size 4000x2000 attached to Zero Point
    When I hover over the room in the preview
    And I drag the bottom edge handle by 1500mm up
    And I wait for 600ms
    Then the room depth should be 500mm
    And the room should not go below minimum depth

  Scenario: Resize handles disappear on mouse leave
    Given I have a room with size 4000x3000 attached to Zero Point
    When I hover over the room in the preview
    And resize handles appear
    And I move the mouse away from the room
    Then the resize handles should disappear

  Scenario: Resize composite room parts
    Given I have a composite room with a part of size 2000x1500
    When I hover over the part in the preview
    Then resize handles should appear on the part
    And I should be able to resize the part independently

  Scenario: Resize updates dependent rooms
    Given I have a room "room1" with size 4000x3000 attached to Zero Point
    And I have a room "room2" with size 3000x2000 attached to "room1:bottom-right"
    When I resize "room1" width to 5000mm
    And I wait for 600ms
    Then "room2" should remain attached to "room1:bottom-right"
    And "room2" position should update accordingly

  Scenario: DSL synchronization after resize
    Given I am viewing the DSL editor
    And I have a room "testroom" with size 4000x3000 attached to Zero Point
    When I switch to the preview tab
    And I resize the room width to 5000mm
    And I wait for 600ms
    And I switch to the DSL editor tab
    Then the DSL should show "5000x3000" for the room dimensions

  Scenario: Undo after resize operation
    Given I have a room "testroom" with size 4000x3000 attached to Zero Point
    When I resize the room width to 5000mm
    And I wait for 600ms
    And I press Ctrl+Z
    And I wait for 600ms
    Then the room width should be 4000mm
    And the DSL should reflect the original dimensions

  Scenario: Redo after resize undo
    Given I have a room "testroom" with size 4000x3000 attached to Zero Point
    When I resize the room width to 5000mm
    And I wait for 600ms
    And I press Ctrl+Z
    And I wait for 600ms
    And I press Ctrl+Shift+Z
    And I wait for 600ms
    Then the room width should be 5000mm
    And the DSL should reflect the resized dimensions
