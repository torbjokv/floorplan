Feature: Object Resizing
  As a user
  I want to resize room objects by dragging corner handles
  So that I can adjust object dimensions visually

  Background:
    Given I am on the floorplan designer page

  Scenario: Resize handles appear on square object hover
    Given I have the following DSL:
      """
      grid 1000

      room livingroom "Living Room" 5000x4000 at zeropoint
          object square "Table" 1000x800 #33d17a at top-left (1000, 1000)
      """
    And I hover over the object "Table" in room "livingroom"
    Then I should see resize handles at all 4 corners of the object
    And the resize handles should have the correct cursor styles

  Scenario: Resize handles appear on circle object hover
    Given I have the following DSL:
      """
      grid 1000

      room livingroom "Living Room" 5000x4000 at zeropoint
          object circle "Lamp" 500 #ffd700 at top-right (500, 500)
      """
    And I hover over the object "Lamp" in room "livingroom"
    Then I should see resize handles at all 4 corners of the object
    And the resize handles should have the correct cursor styles

  Scenario: Resize handles disappear when mouse leaves object
    Given I have the following DSL:
      """
      grid 1000

      room livingroom "Living Room" 5000x4000 at zeropoint
          object square "Table" 1000x800 #33d17a at top-left (1000, 1000)
      """
    And I hover over the object "Table" in room "livingroom"
    And I move the mouse away from the object
    Then I should not see any resize handles for the object

  Scenario: Square displays dimensions on hover
    Given I have the following DSL:
      """
      grid 1000

      room livingroom "Living Room" 5000x4000 at zeropoint
          object square "Table" 1000x800 #33d17a at top-left (1000, 1000)
      """
    And I hover over the object "Table" in room "livingroom"
    Then I should see the dimensions "1000×800" displayed on the object

  Scenario: Circle displays diameter on hover
    Given I have the following DSL:
      """
      grid 1000

      room livingroom "Living Room" 5000x4000 at zeropoint
          object circle "Lamp" 500 #ffd700 at top-right (500, 500)
      """
    And I hover over the object "Lamp" in room "livingroom"
    Then I should see the diameter "⌀500" displayed on the object

  Scenario: Resize square object by dragging bottom-right corner
    Given I have the following DSL:
      """
      grid 1000

      room livingroom "Living Room" 5000x4000 at zeropoint
          object square "Table" 1000x800 #33d17a at top-left (1000, 1000)
      """
    And I hover over the object "Table" in room "livingroom"
    And I drag the bottom-right resize handle by (200, 100) mm
    Then the object should have dimensions 1200x900
    And the DSL should contain "object square \"Table\" 1200x900"

  Scenario: Resize square object by dragging top-left corner
    Given I have the following DSL:
      """
      grid 1000

      room livingroom "Living Room" 5000x4000 at zeropoint
          object square "Table" 1000x800 #33d17a at top-left (1000, 1000)
      """
    And I hover over the object "Table" in room "livingroom"
    And I drag the top-left resize handle by (-200, -100) mm
    Then the object should have dimensions 1200x900
    And the object position should be adjusted accordingly

  Scenario: Resize circle object maintains circular shape
    Given I have the following DSL:
      """
      grid 1000

      room livingroom "Living Room" 5000x4000 at zeropoint
          object circle "Lamp" 500 #ffd700 at top-right (500, 500)
      """
    And I hover over the object "Lamp" in room "livingroom"
    And I drag any corner resize handle to change the size
    Then the object should maintain its circular shape
    And the diameter should change proportionally

  Scenario: Enforce minimum object size during resize
    Given I have the following DSL:
      """
      grid 1000

      room livingroom "Living Room" 5000x4000 at zeropoint
          object square "Small" 200x200 #33d17a at top-left (1000, 1000)
      """
    And I hover over the object "Small" in room "livingroom"
    And I drag the bottom-right resize handle by (-150, -150) mm
    Then the object should not be smaller than the minimum size of 100mm
    And the object should have dimensions at least 100x100

  Scenario: Double-click square dimension text for numeric input
    Given I have the following DSL:
      """
      grid 1000

      room livingroom "Living Room" 5000x4000 at zeropoint
          object square "Table" 1000x800 #33d17a at top-left (1000, 1000)
      """
    And I hover over the object "Table" in room "livingroom"
    And I double-click on the dimensions text
    And I enter dimensions "1500x1200" in the prompt
    Then the object should have dimensions 1500x1200
    And the DSL should contain "object square \"Table\" 1500x1200"

  Scenario: Double-click circle diameter text for numeric input
    Given I have the following DSL:
      """
      grid 1000

      room livingroom "Living Room" 5000x4000 at zeropoint
          object circle "Lamp" 500 #ffd700 at top-right (500, 500)
      """
    And I hover over the object "Lamp" in room "livingroom"
    And I double-click on the diameter text
    And I enter diameter "800" in the prompt
    Then the object should have diameter 800
    And the DSL should contain "object circle \"Lamp\" 800"

  Scenario: Undo after resizing object
    Given I have the following DSL:
      """
      grid 1000

      room livingroom "Living Room" 5000x4000 at zeropoint
          object square "Table" 1000x800 #33d17a at top-left (1000, 1000)
      """
    And I hover over the object "Table" in room "livingroom"
    And I drag the bottom-right resize handle by (200, 100) mm
    And I press "Control+z"
    Then the object should have dimensions 1000x800
    And the DSL should contain "object square \"Table\" 1000x800"

  Scenario: Redo after undoing object resize
    Given I have the following DSL:
      """
      grid 1000

      room livingroom "Living Room" 5000x4000 at zeropoint
          object square "Table" 1000x800 #33d17a at top-left (1000, 1000)
      """
    And I hover over the object "Table" in room "livingroom"
    And I drag the bottom-right resize handle by (200, 100) mm
    And I press "Control+z"
    And I press "Control+Shift+z"
    Then the object should have dimensions 1200x900
    And the DSL should contain "object square \"Table\" 1200x900"

  Scenario: Resize object in a room part
    Given I have the following DSL:
      """
      grid 1000

      room livingroom "Living Room" 5000x4000 at zeropoint
          part closet "Closet" 2000x1500 at parent:bottom-left
              object square "Shelf" 500x1200 #9141ac at top-left (100, 100)
      """
    And I hover over the object "Shelf" in part "closet"
    And I drag the bottom-right resize handle by (100, 200) mm
    Then the object should have dimensions 600x1400
    And the DSL should contain "object square \"Shelf\" 600x1400"

  Scenario: Resize multiple objects independently
    Given I have the following DSL:
      """
      grid 1000

      room livingroom "Living Room" 5000x4000 at zeropoint
          object square "Table" 1000x800 #33d17a at top-left (1000, 1000)
          object circle "Lamp" 500 #ffd700 at top-right (500, 500)
      """
    And I hover over the object "Table" in room "livingroom"
    And I drag the bottom-right resize handle by (200, 100) mm
    Then the object "Table" should have dimensions 1200x900
    And the object "Lamp" should still have diameter 500
    When I hover over the object "Lamp" in room "livingroom"
    And I drag any corner resize handle to increase the diameter to 700
    Then the object "Lamp" should have diameter 700
    And the object "Table" should still have dimensions 1200x900
