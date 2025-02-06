from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager
import time
import os


def capture_div_with_styling(url, div_selector, output_dir="captured_elements"):
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    chrome_options = Options()
    chrome_options.add_argument("--headless")
    chrome_options.add_argument("--window-size=3840,2160")  # 4K resolution
    chrome_options.add_argument("--force-device-scale-factor=4")  # Increase DPR
    chrome_options.add_argument("--high-dpi-support=1")

    driver = webdriver.Chrome(
        service=Service(ChromeDriverManager().install()), options=chrome_options
    )

    try:
        # Set higher resolution viewport
        driver.execute_cdp_cmd(
            "Emulation.setDeviceMetricsOverride",
            {"width": 3840, "height": 2160, "deviceScaleFactor": 2, "mobile": False},
        )

        driver.get(url)
        time.sleep(2)  # Wait for page to load

        elements = driver.find_elements(By.CSS_SELECTOR, div_selector)

        for i, element in enumerate(elements):
            # Get element location and size
            element_height = element.size["height"]

            # Scroll element to center and hide headers
            driver.execute_script(
                """
                arguments[0].scrollIntoView({block: 'center'});
                // Hide fixed position headers
                var headers = document.querySelectorAll('header, nav, .header, #header, [class*="banner"]');
                headers.forEach(function(header) {
                    if (window.getComputedStyle(header).position === 'fixed') {
                        header.style.display = 'none';
                    }
                });
                
                // Force high-resolution image loading
                var imgs = arguments[0].getElementsByTagName('img');
                for(var i = 0; i < imgs.length; i++) {
                    imgs[i].style.transform = 'scale(1)';
                    if(imgs[i].srcset) {
                        var sources = imgs[i].srcset.split(',');
                        var largestSource = sources[sources.length-1].trim().split(' ')[0];
                        imgs[i].src = largestSource;
                    }
                }
            """,
                element,
            )

            time.sleep(1)  # Increased wait time for high-res images to load

            # Take the high-resolution screenshot
            file_name = f"element_{i}.png"
            file_path = os.path.join(output_dir, file_name)
            element.screenshot(file_path)

            print(f"Captured: {file_path}")

    except Exception as e:
        print(f"Error capturing elements: {str(e)}")

    finally:
        driver.quit()


# Example usage:
url = "https://introml.mit.edu/spring25/info/staff"  # Replace with your target URL
selector = "div.staffmember.instructor"  # Replace with your div selector

capture_div_with_styling(url, selector)

# Example usage for course assistants
selector_course_assistants = "div.staffmember.courseassistant"  # Replace with your div selector for course assistants
capture_div_with_styling(url, selector_course_assistants)

# Example usage for TAs
selector_tas = "div.staffmember.ta"  # Replace with your div selector for TAs
capture_div_with_styling(url, selector_tas)

# Example usage for LAs
selector_las = "div.staffmember.la"  # Replace with your div selector for LAs
capture_div_with_styling(url, selector_las)
