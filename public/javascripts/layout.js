	$(".cross").hide();
	$(".cross").css('opacity', '1');
	$(".mobileMenu").hide();
	$(".mobileMenu").css('opacity', '1');
	$(".hamburger").click(function () {
		$(".mobileMenu").slideToggle("slow", function () {
			$(".hamburger").hide();
			$(".cross").show();
		});
	});

	$(".cross").click(function () {
		$(".mobileMenu").slideToggle("slow", function () {
			$(".cross").hide();
			$(".hamburger").show();
		});
	});

	function deleteDetections() {
		$.post('/dashboard/deleteDetections').then(function () {
			reload();
		});
	}
